alter table service_zones add constraint service_zones_name_unique unique(name);
alter table vehicles add constraint vehicles_registration_unique unique(registration);
alter table buyer_profiles add constraint buyer_profiles_user_unique unique(user_id);
alter table driver_profiles add constraint driver_profiles_user_unique unique(user_id);
